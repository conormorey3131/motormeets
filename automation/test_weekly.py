import unittest
from datetime import date
from weekly import build


def card(day, title='Meet', display=None):
    return f'<div class="event" data-date="{day}" data-location="Cork"><h3>{title}</h3><p class="event-date">{display or day}</p><p>Location: A &amp; B<br>Hall</p></div>'


class WeeklyTests(unittest.TestCase):
    def test_tuesday_through_next_monday_inclusive(self):
        data = ''.join(card(f'2026-09-{day}', str(day)) for day in range(21, 30))
        brief = build(data, date(2026, 9, 21))
        self.assertEqual([e['title'] for e in brief['events']], [str(d) for d in range(22, 29)])

    def test_multi_day_overlap_and_duplicates(self):
        data = card('2026-09-23', display='September 21–23, 2026') * 2
        brief = build(data, date(2026, 9, 21))
        self.assertEqual(len(brief['events']), 1)
        self.assertEqual(brief['events'][0]['start_date'], '2026-09-21')
        self.assertEqual(brief['events'][0]['venue'], 'A & B Hall')

    def test_year_boundary(self):
        brief = build(card('2027-01-04'), date(2026, 12, 28))
        self.assertEqual(brief['end'], '2027-01-04')
        self.assertEqual(len(brief['events']), 1)

    def test_fail_closed_when_source_changes(self):
        with self.assertRaises(ValueError):
            build('<h1>Service unavailable</h1>', date(2026, 9, 21))

    def test_not_monday(self):
        with self.assertRaises(ValueError):
            build(card('2026-09-24'), date(2026, 9, 22))


if __name__ == '__main__':
    unittest.main()
