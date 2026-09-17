"""Render public, downloadable social packs. No Canva account or laptop required."""
import argparse
import html
import json
import zipfile
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
GREEN, INK, PAPER, ORANGE = '#153D31', '#182D26', '#F3F4ED', '#F29340'


def font(size, bold=False):
    candidates = ([ '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    '/System/Library/Fonts/Supplemental/Arial Bold.ttf'] if bold else
                  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                   '/System/Library/Fonts/Supplemental/Arial.ttf'])
    return ImageFont.truetype(next(p for p in candidates if Path(p).exists()), size)


def wrapped(draw, text, size, width, bold=False):
    f = font(size, bold)
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=f) > width and line:
            lines.append(line)
            line = word
        else:
            line = trial
        if draw.textlength(line, font=f) > width:
            raise ValueError('An unbroken word is too wide to render safely.')
    if line:
        lines.append(line)
    return lines


def block(draw, text, x, y, width, size, color, bold=False, max_height=None):
    lines = wrapped(draw, text, size, width, bold)
    while max_height and len(lines) * int(size * 1.25) > max_height and size > 24:
        size -= 2
        lines = wrapped(draw, text, size, width, bold)
    if max_height and len(lines) * int(size * 1.25) > max_height:
        raise ValueError('Text needs editorial shortening before publication: ' + text)
    for line in lines:
        draw.text((x, y), line, font=font(size, bold), fill=color)
        y += int(size * 1.25)
    return y


def canvas(height, number, count, label):
    image = Image.new('RGB', (1080, height), PAPER)
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, 1080, 190), fill=GREEN)
    d.rectangle((0, 190, 1080, 198), fill=ORANGE)
    logo = Image.open(ROOT / 'logo.webp').convert('RGBA')
    logo.thumbnail((128, 128))
    image.paste(logo, (64, 32), logo)
    d.text((222, 64), 'MOTOR MEETS', font=font(42, True), fill='white')
    d.text((224, 119), 'IRELAND  /  THE WEEK AHEAD', font=font(22), fill='#CADACE')
    d.line((64, height - 145, 1016, height - 145), fill='#B7C4B7', width=2)
    d.text((64, height - 116), 'motormeets.ie', font=font(32, True), fill=GREEN)
    d.text((64, height - 65), label, font=font(19), fill=GREEN)
    d.text((918, height - 108), f'{number:02}/{count:02}', font=font(26), fill=GREEN)
    return image, d


def render(brief, out):
    out.mkdir(parents=True, exist_ok=True)
    start, end = date.fromisoformat(brief['start']), date.fromisoformat(brief['end'])
    period = f'{start.day} {start:%b} – {end.day} {end:%b %Y}'
    total = len(brief['events']) + 2
    for channel, height in [('meta', 1350), ('tiktok', 1920)]:
        folder = out / channel
        folder.mkdir(exist_ok=True)
        for i in range(total):
            im, d = canvas(height, i + 1, total, period.upper())
            y = 270 if height == 1350 else 395
            if i == 0:
                d.text((64, y), 'YOUR NEXT DAY OUT', font=font(25, True), fill=GREEN)
                y = block(d, 'Irish car events.', 60, y+72, 950, 116, GREEN, True)
                d.rectangle((64, y+40, 192, y+50), fill=ORANGE)
                y = block(d, period, 64, y+100, 940, 48, INK, True)
                y = block(d, f"{len(brief['events'])} listings. One weekly guide.", 64, y+35, 900, 35, INK)
                block(d, 'Find your next meet, show or motorsport day. Swipe for the line-up.', 64, y+52, 860, 34, INK)
            elif i == total - 1:
                d.text((64, y), 'MAKE A PLAN', font=font(26, True), fill=GREEN)
                y = block(d, 'Pick your event. Bring your people.', 60, y+78, 950, 89, GREEN, True)
                y = block(d, 'Save this guide. Share it with the group chat.', 64, y+70, 880, 39, INK)
                y = block(d, 'Full listings and organiser details at motormeets.ie', 64, y+50, 880, 36, INK)
                block(d, 'Always confirm details with the organiser before travelling.', 64, y+45, 880, 28, INK)
            else:
                e = brief['events'][i-1]
                first, last = date.fromisoformat(e['start_date']), date.fromisoformat(e['end_date'])
                stamp = f'{first:%a %d %b}'.upper()
                if first != last:
                    stamp += f' – {last:%a %d %b}'.upper()
                d.rounded_rectangle((64, y, 1016, y+80), radius=12, fill=GREEN)
                d.text((92, y+22), stamp, font=font(30, True), fill='white')
                y = block(d, e['title'], 64, y+125, 952, 70, GREEN, True, 280)
                y = block(d, e['venue'], 64, y+42, 928, 35, INK, False, 150)
                if e['description']:
                    block(d, e['description'], 64, y+50, 928, 32, INK, False, height-190-y-50)
            im.save(folder / f'{i+1:02}.png', optimize=True)
    with zipfile.ZipFile(out / 'graphics.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(out.glob('*/*.png')):
            archive.write(p, p.relative_to(out))
    captions = (out / 'captions.md').read_text() if (out / 'captions.md').exists() else ''
    galleries = ''.join(f'<h2>{channel.title()}</h2><div class="grid">'+''.join(
        f'<a href="{channel}/{p.name}" download><img src="{channel}/{p.name}" alt="Slide {p.stem}" loading="lazy"></a>'
        for p in sorted((out/channel).glob('*.png')))+'</div>' for channel in ('meta','tiktok'))
    (out / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
        f'<title>Motor Meets | {html.escape(period)}</title><style>body{{font:17px system-ui;background:#f3f4ed;color:#153d31;max-width:1050px;margin:40px auto;padding:20px}}'
        'a{color:inherit}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}img{width:100%;border-radius:10px}'
        'pre{white-space:pre-wrap;background:white;padding:24px;border-radius:12px}</style>'
        f'<h1>Your weekly content pack</h1><p>{html.escape(period)}</p>'
        '<p><a href="graphics.zip" download>Download all graphics</a> · <a href="captions.md" download>Download captions</a></p>'
        f'{galleries}<h2>Captions</h2><pre>{html.escape(captions)}</pre></html>')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--pack', type=Path, required=True)
    args = p.parse_args()
    render(json.loads((args.pack/'events.json').read_text()), args.pack)
