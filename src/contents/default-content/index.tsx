import App from './App';
import styles from './style.css?inline';
import { mountAnchoredUI } from '../utils/anchor-mounter';

void mountAnchoredUI({
  anchor: async () => [document.body],
  mountType: { type: 'overlay' },
  component: () => <App />,
  style: styles,
  hostId: 'extension-content-root',
});
