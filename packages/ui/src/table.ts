export const tableClasses = {
  scroll: 'guide-table-scroll',
  table: 'guide-table',
  head: 'guide-table-head',
  body: 'guide-table-body',
  emptyState: 'guide-table-empty-state',
  row: 'guide-table-row',
  interactiveRow: 'guide-table-row-interactive',
  headerCell: 'guide-table-header-cell',
  cell: 'guide-table-cell',
  nameCell: 'guide-table-cell-name',
  actionsCell: 'guide-table-cell-actions',
} as const

export type TableCellAlign = 'start' | 'center' | 'end'

export interface TableColumn<RowData> {
  key: string
  header: string | Node
  render: (row: RowData, index: number) => string | Node
  align?: TableCellAlign
  className?: string
  headerClassName?: string
  name?: boolean
  actions?: boolean
}

export interface TableOptions<RowData> {
  columns: readonly TableColumn<RowData>[]
  rows: readonly RowData[]
  ariaLabel?: string
  caption?: string
  className?: string
  getRowLabel?: (row: RowData, index: number) => string
  onRowActivate?: (row: RowData, index: number) => void
}

function appendContent(element: HTMLElement, content: string | Node) {
  if (typeof content === 'string') element.textContent = content
  else element.append(content)
}

function getCellClassName<RowData>(column: TableColumn<RowData>, baseClassName: string) {
  return [
    baseClassName,
    column.name ? tableClasses.nameCell : '',
    column.actions ? tableClasses.actionsCell : '',
    column.align ? `${baseClassName}-${column.align}` : '',
    column.className ?? '',
  ].filter(Boolean).join(' ')
}

export function createTable<RowData>({
  columns,
  rows,
  ariaLabel,
  caption,
  className,
  getRowLabel,
  onRowActivate,
}: TableOptions<RowData>) {
  if (typeof document === 'undefined') {
    throw new Error('createTable requires a browser document')
  }

  const scroll = document.createElement('div')
  scroll.className = tableClasses.scroll

  const table = document.createElement('table')
  table.className = [tableClasses.table, className ?? ''].filter(Boolean).join(' ')
  if (ariaLabel) table.setAttribute('aria-label', ariaLabel)

  if (caption) {
    const captionElement = document.createElement('caption')
    captionElement.textContent = caption
    table.append(captionElement)
  }

  const head = document.createElement('thead')
  head.className = tableClasses.head
  const headerRow = document.createElement('tr')
  headerRow.className = tableClasses.row

  for (const column of columns) {
    const headerCell = document.createElement('th')
    headerCell.scope = 'col'
    headerCell.className = [
      getCellClassName(column, tableClasses.headerCell),
      column.headerClassName ?? '',
    ].filter(Boolean).join(' ')
    appendContent(headerCell, column.header)
    headerRow.append(headerCell)
  }

  head.append(headerRow)
  table.append(head)

  const body = document.createElement('tbody')
  body.className = tableClasses.body

  rows.forEach((row, rowIndex) => {
    const rowElement = document.createElement('tr')
    rowElement.className = [
      tableClasses.row,
      onRowActivate ? tableClasses.interactiveRow : '',
    ].filter(Boolean).join(' ')

    if (onRowActivate) {
      rowElement.tabIndex = 0
      const rowLabel = getRowLabel?.(row, rowIndex)
      if (rowLabel) rowElement.setAttribute('aria-label', rowLabel)
      rowElement.addEventListener('click', () => onRowActivate(row, rowIndex))
      rowElement.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onRowActivate(row, rowIndex)
      })
    }

    for (const column of columns) {
      const cell = document.createElement('td')
      cell.className = getCellClassName(column, tableClasses.cell)
      if (column.actions) cell.addEventListener('click', (event) => event.stopPropagation())
      appendContent(cell, column.render(row, rowIndex))
      rowElement.append(cell)
    }

    body.append(rowElement)
  })

  table.append(body)
  scroll.append(table)
  return scroll
}

export const Table = createTable
