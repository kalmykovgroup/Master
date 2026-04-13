import type {ComponentType} from 'react';

export const HotUpdater = {
  wrap: <P extends object>(App: ComponentType<P>) => App,
};
