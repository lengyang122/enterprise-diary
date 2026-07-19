import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import type { DiaryWordData } from '../types'

// 创建 Word 文档
export async function generateWord(data: DiaryWordData): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,   // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // === 标题区 ===
          // 中国计量大学（居中，36pt ≈ 72 半磅）
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '中国计量大学',
                bold: true,
                size: 72, // half-point: 72 = 36pt
                font: '黑体',
              }),
            ],
          }),

          // 学院名称
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: '管理科学与工程学院（质量与标准化学院）',
                size: 44,
                font: '宋体',
              }),
            ],
          }),

          // 专业名称
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: '质量管理工程专业',
                bold: true,
                size: 52,
                font: '黑体',
              }),
            ],
          }),

          // 企业实践日记
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '企业实践日记',
                bold: true,
                size: 52,
                font: '黑体',
              }),
            ],
          }),

          // === 固定信息 ===
          infoLine('姓    名：', data.name),
          infoLine('学    号：', data.student_id),
          infoLine('班    级：', data.class_name),
          infoLine('学院名称：', data.college),
          infoLine('专业指导教师：', data.teacher),
          infoLine('实习单位：', data.company),
          infoLine('企业指导教师：', data.company_teacher),
          infoLine('实习时间：', `${data.start_date}~${data.end_date}`),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // === 每日日记表格 ===
          createDiaryTable(data),

          // === 备注 ===
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: '备注：',
                font: '宋体',
                size: 24,
              }),
              new TextRun({
                text: '实习时间按日填写',
                font: '宋体',
                size: 24,
              }),
            ],
          }),
        ],
      },
    ],
  })

  return await Packer.toBlob(doc)
}

// 信息行
function infoLine(label: string, value: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 1120 },
    spacing: { after: 40 },
    children: [
      new TextRun({
        text: label,
        size: 32,
        font: '黑体',
      }),
      new TextRun({
        text: value,
        size: 32,
        font: '黑体',
        underline: { type: 'single' },
      }),
    ],
  })
}

// 创建日记表格
function createDiaryTable(data: DiaryWordData): Table {
  // 字体大小：24 半磅 = 12pt
  const CELL_SIZE = 24

  return new Table({
    width: {
      size: 8296,
      type: WidthType.DXA,
    },
    rows: [
      // 第1行：实习时间 | 实习岗位
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 3885, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: 360 },
                children: [
                  new TextRun({ text: '实习时间：', size: CELL_SIZE, font: '宋体' }),
                  new TextRun({ text: data.date, size: CELL_SIZE, font: '宋体' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4411, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: 360 },
                children: [
                  new TextRun({ text: '实习岗位：', size: CELL_SIZE, font: '宋体' }),
                  new TextRun({ text: data.position, size: CELL_SIZE, font: '宋体' }),
                ],
              }),
            ],
          }),
        ],
      }),

      // 第2行：实习内容（跨两列）
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 8296, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: 360 },
                children: [
                  new TextRun({ text: '实习内容：', size: CELL_SIZE, font: '宋体', bold: true }),
                  new TextRun({ text: data.content, size: CELL_SIZE, font: '宋体' }),
                ],
              }),
            ],
          }),
        ],
      }),

      // 第3行：实习体会和感受（跨两列）
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 8296, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: 360 },
                children: [
                  new TextRun({ text: '实习体会和感受：', size: CELL_SIZE, font: '宋体', bold: true }),
                  new TextRun({ text: data.feelings, size: CELL_SIZE, font: '宋体' }),
                ],
              }),
            ],
          }),
        ],
      }),

      // 第4行：其他（跨两列）
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 8296, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: 360 },
                children: [
                  new TextRun({ text: '其他：', size: CELL_SIZE, font: '宋体', bold: true }),
                  new TextRun({ text: data.other, size: CELL_SIZE, font: '宋体' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// 下载 Word 文件
export async function downloadWord(data: DiaryWordData, fileName?: string) {
  const blob = await generateWord(data)
  const name = fileName || `企业实践日记_${data.name}_${data.date}.docx`
  saveAs(blob, name)
}
