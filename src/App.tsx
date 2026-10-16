import { LeftPanel } from './components/LeftPanel';
import { MiddlePanel } from './components/MiddlePanel';
import { RightPanel } from './components/RightPanel';
import { FloatingScreenPreview } from './components/FloatingScreenPreview';

export default function App() {
  return (
    <div 
      className="flex h-screen w-screen min-h-screen bg-bg-main p-4 gap-4 text-text-primary font-sans overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("/background.png")' }}
    >
      <LeftPanel />
      <MiddlePanel />
      <RightPanel />

      <FloatingScreenPreview />
    </div>
  );
}
