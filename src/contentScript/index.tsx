import App from './App';
import styles from './style.css?inline';
import { mountAnchoredUI } from '../utils/anchor-mounter';
import React from 'react';

void mountAnchoredUI({
  anchor: async () => [document.body],
  mountType: { type: 'overlay' },
  component: () => React.createElement(App),
  style: styles,
  hostId: 'extension-content-root',
});
