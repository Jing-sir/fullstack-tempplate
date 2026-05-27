export default function useKeyDown(handleSubmit: () => void) {
    const handleKeyDown = (event: { code: string }) =>  {
        if (event.code === 'Enter') {
            handleSubmit();
        }
    };

    const onBindKeyDown = (): void => {
        document.addEventListener('keydown', handleKeyDown);
    };

    const unKeyDown = (): void => {
        document.removeEventListener('keydown', handleKeyDown);
    };

    onMounted(onBindKeyDown);

    onUnmounted(unKeyDown);

    return {
        unKeyDown,
        onBindKeyDown,
    };
}
