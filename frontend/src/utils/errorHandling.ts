import { AxiosError } from "axios";

export const handleError = (error: unknown, fallbackMessage = 'Something went wrong') => {
  const axiosError = error as AxiosError;

  if (axiosError.response?.data) {
    const data: any = axiosError.response.data;
    // Prefer backend's message field so frontend shows exact same text
    const msg = data.message || data.error || fallbackMessage;

    const customError = new Error(msg);
    (customError as any).response = data;
    (customError as any).axiosResponse = axiosError.response;
    throw customError;
  }

  throw new Error(axiosError.message || fallbackMessage);
};

export default handleError;