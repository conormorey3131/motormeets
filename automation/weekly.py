"""Build a Tuesday–Monday editorial brief from the live site's event cards."""
import argparse
import calendar
import hashlib
import json
import re
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path


class EventParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.events = []
        self.stack = []
        self.current = None
        self.field = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and 'event' in attrs.get('class', '').split() and self.current is None:
            self.current = dict(date=attrs.get('data-date', ''), county=attrs.get('data-location', ''),
                                type=attrs.get('data-type', '').lower(), title='', paragraphs=[], url='')
            self.stack = ['div']
            return
        if self.current is None:
            return
        if tag not in ('br', 'img', 'input', 'hr', 'meta', 'link'):
            self.stack.append(tag)
        if tag in ('h3', 'p'):
            self.field = [tag, attrs.get('class', ''), '']
        if tag == 'br' and self.field:
            self.field[2] += ' '
        if tag == 'a' and attrs.get('href', '').startswith(('https://', 'http://')):
            self.current['url'] = attrs['href']

    def handle_data(self, text):
        if self.field:
            self.field[2] += text

    def handle_endtag(self, tag):
        if self.current is None:
            return
        if self.field and tag == self.field[0]:
            _, cls, raw = self.field
            text = ' '.join(raw.split())
            if tag == 'h3':
                self.current['title'] = text
            elif 'event-date' in cls.split():
                self.current['display_date'] = text
            elif text:
                self.current['paragraphs'].append(text)
            self.field = None
        if tag in self.stack:
            pos = len(self.stack) - 1 - self.stack[::-1].index(tag)
            self.stack = self.stack[:pos]
        if not self.stack:
            self.events.append(self.current)
            self.current = None


def dates(event):
    end = date.fromisoformat(event['date'])
    label = event.get('display_date', '')
    months = '|'.join(calendar.month_name[1:])
    match = re.fullmatch(rf'({months})\s+(\d{{1,2}})\s*[–—-]\s*(\d{{1,2}}),?\s+(\d{{4}})', label, re.I)
    if match:
        month, first, last, year = match.groups()
        month = [m.lower() for m in calendar.month_name].index(month.lower())
        return date(int(year), month, int(first)), date(int(year), month, int(last))
    return end, end


def build(html, monday):
    if monday.weekday() != 0:
        raise ValueError('The issue date must be a Monday in Europe/Dublin.')
    start, end = monday + timedelta(days=1), monday + timedelta(days=7)
    parser = EventParser()
    parser.feed(html)
    events, warnings, seen = [], [], set()
    if not parser.events:
        raise ValueError('No event cards found; the website format may have changed.')
    for event in parser.events:
        try:
            first, last = dates(event)
        except ValueError:
            warnings.append('Invalid date: ' + event['title'])
            continue
        if first > end or last < start:
            continue
        key = (event['title'].casefold(), first.isoformat(), event['county'].casefold())
        if key in seen:
            continue
        seen.add(key)
        event['start_date'], event['end_date'] = first.isoformat(), last.isoformat()
        event['id'] = hashlib.sha256('|'.join(key).encode()).hexdigest()[:16]
        event['venue'] = next((p[9:].strip() for p in event['paragraphs'] if p.startswith('Location:')), event['county'])
        event['description'] = next((p[12:].strip() for p in event['paragraphs'] if p.startswith('Description:')), '')
        events.append(event)
    events.sort(key=lambda e: (e['start_date'], e['title'].casefold()))
    return dict(issue_date=monday.isoformat(), timezone='Europe/Dublin',
                start=start.isoformat(), end=end.isoformat(), events=events, warnings=warnings,
                source='https://motormeets.ie/', verification='Website listings; organiser details not independently verified.')


def captions(brief):
    start, end = date.fromisoformat(brief['start']), date.fromisoformat(brief['end'])
    period = f'{start.day} {start:%B} – {end.day} {end:%B %Y}'
    lines = [f"• {e.get('display_date', e['date'])}: {e['title']} — {e['county']}" for e in brief['events']]
    if not lines:
        return f'No events currently listed for {period}. Check motormeets.ie for updates.\n'
    listing = '\n'.join(lines)
    return (f'# Facebook / Instagram\n\nYour next week of Irish motoring events | {period}\n\n{listing}\n\n'
            'Save this line-up and share it with your weekend crew. Full listings and organiser links: motormeets.ie '
            '(Instagram: link in bio). Check with the organiser before travelling.\n\n'
            '#MotorMeetsIreland #IrishCarScene #CarsAndCoffee #IrishMotorsport\n\n'
            f'# TikTok\n\nWhere are you heading next? 🇮🇪\nIrish car events, {period}. '
            'Swipe through the line-up and tell us your pick. Save this for your next day out.\n\n'
            'Full details at motormeets.ie. Confirm with the organiser before travelling.\n\n'
            '#MotorMeetsIreland #CarTok #IrishCarScene #CarEvents\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--html', required=True, type=Path)
    parser.add_argument('--monday', required=True, type=date.fromisoformat)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    brief = build(args.html.read_text(), args.monday)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'events.json').write_text(json.dumps(brief, indent=2, ensure_ascii=False))
    (args.out / 'captions.md').write_text(captions(brief))
    print(f"Prepared {len(brief['events'])} events: {brief['start']} through {brief['end']}")


if __name__ == '__main__':
    main()
