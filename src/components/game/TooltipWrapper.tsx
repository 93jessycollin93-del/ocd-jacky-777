import { ReactNode } from 'react';

export default function TooltipWrapper({ children, content }: { children: ReactNode; content: string }) {
  return <div title={content}>{children}</div>;
}
