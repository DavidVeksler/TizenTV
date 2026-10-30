import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerRemoteKeys } from './keys';

registerRemoteKeys();
createRoot(document.getElementById('root')!).render(<App />);
