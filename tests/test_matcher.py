from fiverr_alarm.matcher import Deduper, is_fiverr
from fiverr_alarm.notice import Notice


def test_phone_link_fiverr_matches():
    assert is_fiverr(Notice(1, "Phone Link", "Fiverr", "New message from john"))
def test_other_app_ignored():
    assert not is_fiverr(Notice(2, "Phone Link", "WhatsApp", "hi"))
def test_non_phone_link_ignored():
    assert not is_fiverr(Notice(3, "Chrome", "Fiverr", "x"))
def test_case_insensitive():
    assert is_fiverr(Notice(4, "PHONE LINK", "FIVERR", ""))
def test_dedupe_same_within_window():
    d = Deduper(60); n = Notice(5, "Phone Link", "Fiverr", "a")
    assert d.should_fire(n, 0) and not d.should_fire(n, 59)
def test_dedupe_same_after_window():
    d = Deduper(60); n = Notice(5, "Phone Link", "Fiverr", "a")
    assert d.should_fire(n, 0) and d.should_fire(n, 61)
def test_different_messages_both_fire():
    d = Deduper(60)
    assert d.should_fire(Notice(6, "Phone Link", "Fiverr", "a"), 0)
    assert d.should_fire(Notice(7, "Phone Link", "Fiverr", "b"), 1)
