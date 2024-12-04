import {
  DataGridCell,
  Cell,
  exportDataGrid,
  exportGantt,
  GanttExportFont,
  DataGridExportOptions,
  GanttExportOptions,
} from './common/export/pdf';

import { PdfDataGridCell } from './pdf_exporter.types';

export {
  /**
   * @deprecated Use DataGridCell from common/export/pdf instead
   */
  DataGridCell,
  /**
   * @deprecated Use Cell from common/export/pdf instead
   */
  Cell,
  /**
   * @deprecated Use exportDataGrid from common/export/pdf instead
   */
  exportDataGrid,
  /**
   * @deprecated Use exportGantt from common/export/pdf instead
   */
  exportGantt,
  /**
   * @deprecated Use GanttExportFont from common/export/pdf instead
   */
  GanttExportFont as PdfExportGanttFont,
  /**
   * @deprecated Use DataGridExportOptions from common/export/pdf instead
   */
  DataGridExportOptions as PdfExportDataGridProps,
  /**
   * @deprecated Use GanttExportOptions from common/export/pdf instead
   */
  GanttExportOptions as PdfExportGanttProps,
  /**
   * @deprecated Use DataGridCell from common/export/pdf instead
   */
  PdfDataGridCell,
};
