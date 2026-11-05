// "Download report" on the Analytics screen: the usage numbers as a PDF for management, without errors or
// replays. Made in the browser with jsPDF; the screen loads this file only when the button is clicked.
import { jsPDF } from 'jspdf';
import { featureLabel, pageLabel, type Report } from '@/lib/analyticsReport';

// A4 in millimetres.
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const WIDTH = 210 - 2 * MARGIN;
const LINE = 6;

type Column = { title: string; width: number; align?: 'right' };

export function downloadUsagePdf(report: Report, periodDescription: string) {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = MARGIN;

    function newPageIfFull(needed: number) {
        if (y + needed > PAGE_HEIGHT - MARGIN) {
            pdf.addPage();
            y = MARGIN;
        }
    }

    // Shortens text that doesn't fit its column, with an ellipsis.
    function fit(text: string, width: number) {
        if (pdf.getTextWidth(text) <= width) {
            return text;
        }
        let shortened = text;
        while (shortened && pdf.getTextWidth(`${shortened}…`) > width) {
            shortened = shortened.slice(0, -1);
        }
        return `${shortened}…`;
    }

    function row(cells: string[], columns: Column[], bold = false) {
        newPageIfFull(LINE);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        let x = MARGIN;
        cells.forEach((cell, index) => {
            const column = columns[index];
            const text = fit(cell, column.width - 2);
            pdf.text(text, column.align === 'right' ? x + column.width : x, y, { align: column.align ?? 'left' });
            x += column.width;
        });
        y += LINE;
    }

    function section(title: string, columns: Column[], rows: string[][] | null) {
        newPageIfFull(4 * LINE);
        y += LINE;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text(title, MARGIN, y);
        y += LINE + 1;
        pdf.setFontSize(10);
        if (!rows) {
            row(["This couldn't be loaded."], [{ title: '', width: WIDTH }]);
            return;
        }
        if (rows.length === 0) {
            row(['Nothing in this period.'], [{ title: '', width: WIDTH }]);
            return;
        }
        row(
            columns.map((column) => column.title),
            columns,
            true,
        );
        rows.forEach((cells) => row(cells, columns));
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('Wirescout usage', MARGIN, y + 4);
    y += 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const today = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date());
    pdf.text(`${periodDescription}, to ${today}`, MARGIN, y);

    section(
        `Active users: ${report.activeUsers?.length ?? 0}`,
        [
            { title: 'Person', width: WIDTH - 50 },
            { title: 'Active days', width: 25, align: 'right' },
            { title: 'Pages', width: 25, align: 'right' },
        ],
        report.activeUsers?.map((user) => [user.name, String(user.days), String(user.pages)]) ?? null,
    );
    section(
        'Features used',
        [
            { title: 'Feature', width: WIDTH - 50 },
            { title: 'Times', width: 25, align: 'right' },
            { title: 'People', width: 25, align: 'right' },
        ],
        report.topFeatures?.map((feature) => [featureLabel(feature), String(feature.times), String(feature.people)]) ?? null,
    );
    section(
        'Most shared stories',
        [
            { title: 'Story', width: WIDTH - 90 },
            { title: 'Source', width: 40 },
            { title: 'Shares', width: 25, align: 'right' },
            { title: 'Drafts', width: 25, align: 'right' },
        ],
        report.topStories?.map((story) => [story.title, story.source, String(story.shares), String(story.drafts)]) ?? null,
    );
    section(
        'Top pages',
        [
            { title: 'Page', width: WIDTH - 50 },
            { title: 'Views', width: 25, align: 'right' },
            { title: 'People', width: 25, align: 'right' },
        ],
        report.topPages?.map((page) => [pageLabel(page.screen), String(page.views), String(page.people)]) ?? null,
    );

    pdf.save(`wirescout-usage-${new Date().toISOString().slice(0, 10)}.pdf`);
}
