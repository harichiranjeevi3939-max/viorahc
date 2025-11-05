export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove 'data:*/*;base64,' prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

const MAX_IMAGE_SIZE_MB = 1;

export const imageFileToDataUrl = (file: File): Promise<{ src: string; fileName: string }> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return reject(new Error('File is not an image.'));
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            return reject(new Error(`Image is too large. Max size is ${MAX_IMAGE_SIZE_MB}MB.`));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({ src: result, fileName: file.name });
        };
        reader.onerror = (error) => reject(error);
    });
};