## mezn-cbz

> 代码由 gemini 生成

### Cloudflare Pages 部署参数

- 框架预设：`React (Vite)`

- 构建命令：`npm run build`

- 构建输出目录：`/dist`

- 环境变量（高级）：添加变量 `NODE_VERSION` = `24`

### openlist 预览配置

- iframe 预览

  ```
  {
    "doc,docx,xls,xlsx,ppt,pptx": {
      "Microsoft": "https://view.officeapps.live.com/op/view.aspx?src=$e_url",
      "Google": "https://docs.google.com/gview?url=$e_url&embedded=true"
    },
    "pdf": {
      "PDF.js": "https://res.oplist.org/pdf.js/web/viewer.html?file=$e_url"
    },
    "epub": {
      "EPUB.js": "https://res.oplist.org/epub.js/viewer.html?url=$e_url"
    },
    "cbz": {
      "MeznReader": "https://部署域名/?url=$e_url"
    }
  }
  ```

- 外部预览

  ```
  {
    "cbz": {
      "MeznReader": "https://部署域名/?url=$e_url"
    }
  }
  ```