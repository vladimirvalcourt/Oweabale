/// <reference types="vite/client" />

// Allow ?url imports (e.g. pdfjs worker)
declare module '*?url' {
  const src: string;
  export default src;
}
