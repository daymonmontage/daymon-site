import numpy as np
from scipy.io.wavfile import write
import os

# =========================
# CONFIG
# =========================
RATE = 44100
BPM = 110
BEAT_LEN = 60.0 / BPM
BEATS_PER_BAR = 4

BARS = 8  # длина одного лупа
OUTPUT_DIR = "games/flappy/assets"
OUT_NAME = "music.wav"

MASTER_HEADROOM_DB = -1.0
SEAMLESS_XFADE_MS = 120  # увеличен для плавности

np.random.seed(1)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# =========================
# UTILS
# =========================
def db_to_lin(db):
    return 10 ** (db / 20.0)

def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def normalize_peak(x, headroom_db=-1.0):
    peak = np.max(np.abs(x)) + 1e-12
    target = db_to_lin(headroom_db)
    return x * (target / peak)

def soft_clip_tanh(x, drive=1.5):
    return np.tanh(drive * x) / np.tanh(drive)

def one_pole_lowpass(x, cutoff_hz):
    a = np.exp(-2.0 * np.pi * cutoff_hz / RATE)
    y = np.zeros_like(x, dtype=np.float64)
    for i in range(1, len(x)):
        y[i] = (1.0 - a) * x[i] + a * y[i - 1]
    return y

def one_pole_highpass(x, cutoff_hz):
    return x - one_pole_lowpass(x, cutoff_hz)

def adsr_env(n, a, d, s, r):
    env = np.zeros(n, dtype=np.float64)
    A = int(a * RATE)
    D = int(d * RATE)
    R = int(r * RATE)
    S_len = max(0, n - (A + D + R))

    idx = 0
    if A > 0:
        env[idx:idx + A] = np.linspace(0, 1, A, endpoint=False)
        idx += A
    if D > 0:
        env[idx:idx + D] = np.linspace(1, s, D, endpoint=False)
        idx += D
    if S_len > 0:
        env[idx:idx + S_len] = s
        idx += S_len
    if R > 0 and idx < n:
        env[idx:n] = np.linspace(env[idx - 1] if idx > 0 else s, 0, n - idx, endpoint=True)
    return env

def osc_sine(freq, n, phase=0.0):
    t = (np.arange(n) / RATE)
    return np.sin(2 * np.pi * freq * t + phase)

def osc_saw(freq, n, phase=0.0):
    t = (np.arange(n) / RATE)
    x = (freq * t + phase / (2*np.pi)) % 1.0
    return 2.0 * x - 1.0

def osc_square(freq, n, phase=0.0, pw=0.5):
    t = (np.arange(n) / RATE)
    x = (freq * t + phase / (2*np.pi)) % 1.0
    return np.where(x < pw, 1.0, -1.0)

def pan_stereo(mono, pan):
    pan = np.clip(pan, -1.0, 1.0)
    angle = (pan + 1.0) * (np.pi / 4.0)
    L = np.cos(angle) * mono
    R = np.sin(angle) * mono
    return np.stack([L, R], axis=1)

def add_event(stereo_buf, start, stereo_event, gain=1.0):
    end = start + len(stereo_event)
    if start >= len(stereo_buf):
        return
    end = min(end, len(stereo_buf))
    stereo_buf[start:end] += stereo_event[:end - start] * gain

def feedback_delay_stereo(x, delay_ms=240, feedback=0.35, mix=0.20):
    d = int(RATE * delay_ms / 1000.0)
    if d <= 0:
        return x
    y = x.copy().astype(np.float64)
    for ch in range(2):
        for i in range(d, len(y)):
            y[i, ch] += y[i - d, ch] * feedback
    return x * (1.0 - mix) + y * mix

def simple_room_reverb_stereo(x, mix=0.12):
    taps_ms = [29, 37, 41, 53, 71]
    gains =   [0.22, 0.18, 0.16, 0.14, 0.12]
    wet = np.zeros_like(x, dtype=np.float64)
    for tap_ms, g in zip(taps_ms, gains):
        d = int(RATE * tap_ms / 1000.0)
        if d <= 0:
            continue
        wet[d:] += x[:-d] * g
    wet[:, 0] = one_pole_lowpass(wet[:, 0], 6500)
    wet[:, 1] = one_pole_lowpass(wet[:, 1], 6500)
    return x * (1.0 - mix) + wet * mix

def make_seamless_loop_circular(stereo, loop_len, xfade_samples):
    """
    Правильный circular crossfade:
    Берём хвост (после loop_len) и подмешиваем в начало,
    затем обрезаем до loop_len
    """
    xfade = min(xfade_samples, loop_len // 4, len(stereo) - loop_len)
    if xfade < 16:
        return stereo[:loop_len]
    
    result = stereo[:loop_len].copy()
    tail = stereo[loop_len:loop_len + xfade].copy()
    
    # Equal-power crossfade weights
    t = np.linspace(0, 1, xfade, endpoint=False)
    fade_in = np.sqrt(t)      # для хвоста, нарастает
    fade_out = np.sqrt(1 - t) # для хвоста, затухает
    
    # Хвост от предыдущего лупа накладывается на начало
    for ch in range(2):
        result[:xfade, ch] = result[:xfade, ch] + tail[:, ch] * fade_out
    
    # Конец текущего лупа плавно затухает (будет подхвачен хвостом при повторе)
    for ch in range(2):
        result[-xfade:, ch] *= np.sqrt(np.linspace(1, 0, xfade))
        result[-xfade:, ch] += stereo[:xfade, ch] * np.sqrt(np.linspace(0, 1, xfade))
    
    return result

# =========================
# DRUMS
# =========================
def create_kick():
    dur = 0.35
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    freq = np.linspace(160, 45, n)
    phase = 2 * np.pi * np.cumsum(freq) / RATE
    env = np.exp(-10.0 * t)
    click = np.exp(-140.0 * t) * np.sin(2 * np.pi * 2500 * t)
    body = np.sin(phase) * env
    out = (0.95 * body + 0.15 * click) * 0.9
    out = one_pole_lowpass(out, 9000)
    return out

def create_snare():
    dur = 0.22
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    noise = np.random.uniform(-1, 1, n)
    noise = one_pole_highpass(noise, 900)
    env = np.exp(-16.0 * t)
    tone = osc_sine(190, n) * np.exp(-8.0 * t)
    out = (0.78 * noise + 0.22 * tone) * env
    out = one_pole_lowpass(out, 9000)
    return out * 0.7

def create_clap():
    dur = 0.18
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    noise = np.random.uniform(-1, 1, n)
    noise = one_pole_highpass(noise, 1200)
    env = (np.exp(-30*t) +
           0.7*np.exp(-30*np.maximum(0, t-0.015)) +
           0.55*np.exp(-30*np.maximum(0, t-0.030)))
    env *= np.exp(-8*t)
    out = noise * env
    out = one_pole_lowpass(out, 10000)
    return out * 0.55

def create_hat(closed=True):
    dur = 0.06 if closed else 0.18
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    s = (0.35 * osc_square(420, n) +
         0.30 * osc_square(860, n) +
         0.25 * osc_square(1240, n) +
         0.20 * osc_square(2060, n))
    s += 0.25 * np.random.uniform(-1, 1, n)
    s = one_pole_highpass(s, 5000)
    env = np.exp(-70.0 * t) if closed else np.exp(-18.0 * t)
    out = s * env
    return out * (0.28 if closed else 0.22)

# =========================
# MUSIC SYNTHS
# =========================
def create_bass_note(freq, dur, cutoff=650, drive=1.2):
    n = int(RATE * dur)
    saw = osc_saw(freq, n)
    sub = osc_sine(freq / 2.0, n)
    x = 0.55 * sub + 0.45 * saw
    env = adsr_env(n, a=0.005, d=0.06, s=0.55, r=0.06)
    x *= env
    x = soft_clip_tanh(x, drive=drive)
    x = one_pole_lowpass(x, cutoff)
    if n > 64:
        x[-64:] *= np.linspace(1, 0, 64, endpoint=True)
    return x * 0.9

def create_pad_chord(freqs, dur, cutoff=1600):
    n = int(RATE * dur)
    chord = np.zeros(n, dtype=np.float64)
    detunes = [0.995, 1.000, 1.006]
    for f, dt in zip(freqs, detunes):
        chord += 0.55 * osc_saw(f * dt, n, phase=np.random.uniform(0, 2*np.pi))
        chord += 0.25 * osc_sine(f * 0.5 * dt, n, phase=np.random.uniform(0, 2*np.pi))
    chord /= max(1, len(freqs))
    # Укороченный release чтобы не выходил за такт
    env = adsr_env(n, a=0.12, d=0.20, s=0.60, r=0.15)
    chord *= env
    chord = one_pole_lowpass(chord, cutoff)
    chord = soft_clip_tanh(chord, drive=1.1)
    return chord * 0.55

def create_pluck(freq, dur):
    n = int(RATE * dur)
    x = 0.65 * osc_square(freq, n, pw=0.35) + 0.35 * osc_saw(freq, n)
    env = adsr_env(n, a=0.002, d=0.09, s=0.0, r=0.02)
    x *= env
    x = one_pole_lowpass(x, 4200)
    return x * 0.35

def sidechain_envelope(total_samples, kick_positions, attack=0.002, release=0.22, amount=0.55):
    env = np.zeros(total_samples, dtype=np.float64)
    A = max(1, int(attack * RATE))
    R = max(1, int(release * RATE))
    shape = np.concatenate([
        np.linspace(1.0, 0.0, A, endpoint=False),
        np.linspace(0.0, 1.0, R, endpoint=True)
    ])
    for pos in kick_positions:
        end = min(total_samples, pos + len(shape))
        env[pos:end] = np.maximum(env[pos:end], shape[:end - pos])
    return 1.0 - amount * env

# =========================
# TRACK GEN
# =========================
def generate_track():
    samples_per_beat = int(round(RATE * BEAT_LEN))
    one_loop_samples = samples_per_beat * BEATS_PER_BAR * BARS
    
    # ★ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: генерируем 2 лупа + хвост для эффектов
    tail_samples = int(RATE * 0.5)  # 500ms хвост для delay/reverb
    total_samples = one_loop_samples * 2 + tail_samples
    
    mix = np.zeros((total_samples, 2), dtype=np.float64)

    steps_per_bar = 16
    step_len = (samples_per_beat * BEATS_PER_BAR) // steps_per_bar

    kick = create_kick()
    snare = create_snare()
    clap = create_clap()
    hat_c = create_hat(closed=True)
    hat_o = create_hat(closed=False)

    kick_positions = []

    kick_pat_a = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0]
    kick_pat_b = [1,0,0,0, 0,0,1,0, 1,0,0,1, 0,1,0,0]
    snare_pat  = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
    clap_pat   = [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0]
    hat_pat    = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
    open_hat_pat = [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]

    # Генерируем 2 полных лупа
    for loop_idx in range(2):
        loop_offset = loop_idx * one_loop_samples
        for bar in range(BARS):
            base = loop_offset + bar * samples_per_beat * BEATS_PER_BAR
            kick_pat = kick_pat_a if (bar % 4) < 3 else kick_pat_b
            for s in range(steps_per_bar):
                pos = base + s * step_len

                if kick_pat[s] == 1:
                    kick_positions.append(pos)
                    add_event(mix, pos, pan_stereo(kick, 0.0), gain=1.0)

                if snare_pat[s] == 1:
                    add_event(mix, pos, pan_stereo(snare, 0.05), gain=0.95)

                if clap_pat[s] == 1 and (bar % 2 == 1):
                    add_event(mix, pos, pan_stereo(clap, -0.05), gain=0.8)

                if hat_pat[s] == 1:
                    g = 0.55 if (s % 4 == 0) else 0.45
                    add_event(mix, pos, pan_stereo(hat_c, 0.25), gain=g)

                if open_hat_pat[s] == 1:
                    add_event(mix, pos, pan_stereo(hat_o, 0.35), gain=0.65)

    # BASS
    bass = np.zeros((total_samples, 2), dtype=np.float64)
    note_len = (samples_per_beat // 2) / RATE
    bar_roots = [41, 43, 45, 41, 41, 43, 45, 41]
    rhythm = [1, 0, 1, 1, 1, 0, 1, 1]

    for loop_idx in range(2):
        loop_offset = loop_idx * one_loop_samples
        cur = loop_offset
        for i in range(BARS * 8):
            bar = (i // 8)
            root = bar_roots[bar % len(bar_roots)]
            if (i % 8) in (6, 7):
                midi = root + (2 if (i % 8) == 6 else 7)
            else:
                midi = root

            if rhythm[i % len(rhythm)] == 1:
                n = create_bass_note(midi_to_freq(midi), note_len, cutoff=700, drive=1.25)
                add_event(bass, cur, pan_stereo(n, -0.12), gain=0.95)
            cur += int(RATE * note_len)

    # PAD CHORDS
    pad = np.zeros((total_samples, 2), dtype=np.float64)
    chord_len = (samples_per_beat * BEATS_PER_BAR) / RATE

    chords = [
        [midi_to_freq(53), midi_to_freq(57), midi_to_freq(60)],
        [midi_to_freq(55), midi_to_freq(59), midi_to_freq(62)],
        [midi_to_freq(57), midi_to_freq(60), midi_to_freq(64)],
        [midi_to_freq(53), midi_to_freq(57), midi_to_freq(60)],
        [midi_to_freq(53), midi_to_freq(57), midi_to_freq(60)],
        [midi_to_freq(55), midi_to_freq(59), midi_to_freq(62)],
        [midi_to_freq(57), midi_to_freq(60), midi_to_freq(64)],
        [midi_to_freq(53), midi_to_freq(57), midi_to_freq(60)],
    ]

    for loop_idx in range(2):
        loop_offset = loop_idx * one_loop_samples
        for bar in range(BARS):
            pos = loop_offset + bar * samples_per_beat * BEATS_PER_BAR
            chord = create_pad_chord(chords[bar], chord_len, cutoff=1800)
            add_event(pad, pos, pan_stereo(chord, 0.18), gain=0.75)

    # ARP
    arp = np.zeros((total_samples, 2), dtype=np.float64)
    arp_step_len = (samples_per_beat * BEATS_PER_BAR) // 16
    arp_note_len = (arp_step_len / RATE) * 0.9
    arp_pattern = [0, 2, 4, 2, 0, 2, 7, 4]

    for loop_idx in range(2):
        loop_offset = loop_idx * one_loop_samples
        for bar in range(BARS):
            root_m = [53, 55, 57, 53, 53, 55, 57, 53][bar]
            base = loop_offset + bar * samples_per_beat * BEATS_PER_BAR
            for s in range(16):
                if s % 2 == 1:
                    continue
                deg = arp_pattern[(s // 2) % len(arp_pattern)]
                m = root_m + deg
                note = create_pluck(midi_to_freq(m), arp_note_len)
                pos = base + s * arp_step_len
                add_event(arp, pos, pan_stereo(note, 0.35), gain=0.55)

    # SIDECHAIN
    sc = sidechain_envelope(total_samples, kick_positions, attack=0.0015, release=0.25, amount=0.60)
    for layer in (bass, pad, arp):
        layer[:, 0] *= sc
        layer[:, 1] *= sc

    # MIX
    mix += bass
    mix += pad
    mix += arp

    # EFFECTS (применяем ко всему, включая хвост)
    mix = feedback_delay_stereo(mix, delay_ms=240, feedback=0.30, mix=0.10)
    mix = simple_room_reverb_stereo(mix, mix=0.10)

    # MASTER
    mix[:, 0] = one_pole_highpass(mix[:, 0], 28)
    mix[:, 1] = one_pole_highpass(mix[:, 1], 28)
    mix = soft_clip_tanh(mix, drive=1.35)
    mix = normalize_peak(mix, headroom_db=MASTER_HEADROOM_DB)

    # ★ ИЗВЛЕКАЕМ ВТОРОЙ ЛУП (уже с "прогретыми" хвостами от первого)
    loop_start = one_loop_samples
    loop_end = one_loop_samples * 2 + tail_samples
    extended_loop = mix[loop_start:loop_end].copy()
    
    # ★ CIRCULAR CROSSFADE
    xfade_samples = int(RATE * SEAMLESS_XFADE_MS / 1000.0)
    final_loop = make_seamless_loop_circular(extended_loop, one_loop_samples, xfade_samples)

    # SAVE
    out = (final_loop * 32767.0).astype(np.int16)
    path = os.path.join(OUTPUT_DIR, OUT_NAME)
    write(path, RATE, out)
    print(f"✅ Saved seamless loop: {path}")
    print(f"   Loop length: {len(out)/RATE:.3f}s ({BARS} bars @ {BPM} BPM)")
    print(f"   Crossfade: {SEAMLESS_XFADE_MS}ms")

if __name__ == "__main__":
    generate_track()