import { create } from 'zustand'

const useAppStore = create()((set) => ({
    isLoading: false,
    setIsLoading: (isLoading) => set(() => ({ isLoading }))
}));

export { useAppStore }; 
