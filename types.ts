export interface Slide {
  id: number;
  title: string;
  description: string;
  embedCode: string;
  semester?: string;
  fullscreenBehavior?: 'cover' | 'contain';
  fullscreenAction?: 'iframe';
  pdfUrl?: string;
  templateUrl?: string;
}
