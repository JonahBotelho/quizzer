/** Browser entry point with bundled fonts and shared application styles. */
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<App />);


