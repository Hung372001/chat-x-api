import axios from 'axios';

export const callSocket = (path: string, body: any) => {
  try {
    axios.post(`${process.env.SOCKET_BASE_URL}/socket-gateway/${path}`, body, {
      headers: { 'x-api-key': process.env.X_API_KEY },
    });
  } catch (e) {
    console.log(e);
  }
};
