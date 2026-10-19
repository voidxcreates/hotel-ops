import { createContext, useContext } from 'react';

export const OwnerContext = createContext(null);
export const useOwner = () => useContext(OwnerContext);
