"""Tests for the scraper parsers. Run: python3 -m unittest discover scripts/corpus"""

import unittest

import common
import scrape_dsn_fatwa as dsn
import scrape_ojk_regulasi as ojk

FATWA_PAGE = """
<table><tr><th>Nomor Fatwa</th><th>Tentang</th><th>Baca / Unduh</th></tr>
<tr><td>167/DSN-MUI/IX/2026</td><td>Akad <em>Rahn</em> dan Produk Rahn</td>
<td><a href="https://drive.google.com/file/d/1oF996ZlT/view?usp=sharing"><img></a></td></tr>
<tr><td>04/DSN-MUI/IV/2000</td><td>Murabahah</td>
<td><a href="https://drive.google.com/file/d/0BxTl-lNih/view?usp=sharing&amp;resourcekey=0-lsYI"></a></td></tr>
</table>
<a href="https://dsnmui.or.id/kategori/fatwa/page/2/">2</a>
<a href="https://dsnmui.or.id/kategori/fatwa/page/17/">17</a>
"""

OJK_RESULTS = """
<table><tr><td> PADK 13 Tahun 2026 </td><td><strong>
<a id="x" href="/id/regulasi/Pages/PADK-13-Tahun-2026-Rencana-Bisnis.aspx">Rencana Bisnis Bank Perekonomian Rakyat Syariah</a>
</strong><div class="caption"> Peraturan ADK &#8226; Perbankan &#8226;   2026 </div></td></tr></table>
<nav><span id="ctl00_PlaceHolderMain_ctl01_DataPagerArticles" class="pagination">
<span class="currentPagingButton">1</span>&nbsp;
<a class="pagingButton" href="javascript:__doPostBack(&#39;ctl00$Pager$ctl01$ctl01&#39;,&#39;&#39;)">2</a>&nbsp;
<a class="pagingButton fa fa-arrow-right" href="javascript:__doPostBack(&#39;ctl00$Pager$ctl02$ctl00&#39;,&#39;&#39;)"></a>&nbsp;</span>
</nav>
"""

OJK_DETAIL = """
<span class="sektor-regulasi-display"> Perbankan; Syariah </span>
<span class="subsektor-regulasi-display"> Perbankan Syariah </span>
<span class="jenis-regulasi-display"> Peraturan OJK </span>
<span class="nomor-regulasi-display"> 3 /POJK.03/2016 </span>
<span class="display-date-text tanggal-2"> 1/27/2016 </span>
<a href="/id/regulasi/Documents/Pages/POJK-BPRS/SALINAN-POJK%20BPRS%20(k.e).pdf"><img>SALINAN-POJK BPRS (k.e).pdf</a>
<a href="/id/regulasi/Documents/Pages/POJK-BPRS/Lampiran.zip">Lampiran.zip</a>
<a href="/id/regulasi/Pages/lain.aspx">regulasi lain</a>
"""


class FatwaParsing(unittest.TestCase):
    def test_list_rows(self):
        rows = dsn.parse_list_page(FATWA_PAGE)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["label"], "167/DSN-MUI/IX/2026")
        self.assertEqual(rows[0]["title"], "Akad Rahn dan Produk Rahn")
        self.assertIn("resourcekey=0-lsYI", rows[1]["url"])

    def test_last_page(self):
        self.assertEqual(dsn.last_page(FATWA_PAGE), 17)

    def test_number(self):
        self.assertEqual(dsn.parse_number("04/DSN-MUI/IV/2000"), (4, 2000))
        self.assertEqual(dsn.parse_number("167/DSN-MUI/IX/2026"), (167, 2026))

    def test_drive_id(self):
        self.assertEqual(dsn.drive_file_id("https://drive.google.com/file/d/1oF9-6_Z/view"), "1oF9-6_Z")
        self.assertIsNone(dsn.drive_file_id("https://dsnmui.or.id/fatwa.pdf"))

    def test_relevance(self):
        self.assertEqual(dsn.classify("Murabahah"), "core")
        self.assertEqual(dsn.classify("Penjadwalan Kembali Tagihan Murabahah"), "core")
        self.assertEqual(dsn.classify("Obligasi Syari’ah Ijarah"), "other")
        self.assertEqual(dsn.classify("Akad Tabarru’ pada Asuransi Syari’ah"), "other")
        self.assertEqual(dsn.classify("Safe Deposit Box"), "supporting")


class OjkParsing(unittest.TestCase):
    def test_results(self):
        rows = ojk.parse_results(OJK_RESULTS)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["number"], "PADK 13 Tahun 2026")
        self.assertEqual(rows[0]["type"], "Peraturan ADK")
        self.assertEqual(rows[0]["sector"], "Perbankan")
        self.assertTrue(rows[0]["page_url"].startswith("https://www.ojk.go.id/id/regulasi/Pages/"))

    def test_next_page(self):
        self.assertEqual(ojk.next_page_target(OJK_RESULTS), "ctl00$Pager$ctl01$ctl01")
        last = OJK_RESULTS.replace('currentPagingButton">1<', 'currentPagingButton">2<')
        self.assertIsNone(ojk.next_page_target(last))

    def test_detail(self):
        detail = ojk.parse_detail(OJK_DETAIL)
        self.assertEqual(detail["number"], "3/POJK.03/2016")
        self.assertEqual(detail["effective_date"], "2016-01-27")
        self.assertEqual(detail["sector"], "Perbankan; Syariah")
        self.assertEqual([a["name"] for a in detail["attachments"]], ["SALINAN-POJK BPRS (k.e).pdf", "Lampiran.zip"])
        self.assertTrue(detail["attachments"][0]["url"].endswith("SALINAN-POJK%20BPRS%20%28k.e%29.pdf"))

    def test_filter(self):
        row = {"title": "Akad yang Digunakan dalam Penerbitan Efek Syariah di Pasar Modal", "sector": "Pasar Modal", "type": "Peraturan OJK"}
        self.assertFalse(ojk.passes(row, {"term": "Akad", "relevance": "supporting"}))
        row = {"title": "Kualitas Aset Bank Perekonomian Rakyat Syariah", "sector": "Perbankan", "type": "Peraturan OJK"}
        self.assertTrue(ojk.passes(row, {"term": "Bank Perekonomian Rakyat Syariah", "relevance": "core"}))
        self.assertFalse(ojk.passes(row, {"term": "Dewan Pengawas Syariah", "relevance": "supporting"}))


class Helpers(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(common.slugify("Jual Beli Istishna’ Paralel"), "jual-beli-istishna-paralel")
        self.assertEqual(common.slugify("???"), "tanpa-judul")

    def test_clean_text(self):
        self.assertEqual(common.clean_text("a  \n\n\n\n\fb\n"), "a\n\nb\n")

    def test_fix_ocr_terms(self):
        fixed = common.fix_ocr_terms("Akad gardh, Figh, MUTANAGISHAH, al-Bagarah; figur dan gardu tetap.")
        self.assertEqual(fixed, "Akad qardh, Fiqh, MUTANAQISHAH, al-Baqarah; figur dan gardu tetap.")

    def test_reusable(self):
        self.assertFalse(common.reusable({}, common.REPO_ROOT / "package.json", False))
        done = {"status": "ok", "text_quality": "embedded_ocr"}
        self.assertTrue(common.reusable(done, common.REPO_ROOT / "package.json", False))
        self.assertFalse(common.reusable(done, common.REPO_ROOT / "package.json", True))


if __name__ == "__main__":
    unittest.main()
