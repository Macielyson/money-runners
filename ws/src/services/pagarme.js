import axios from 'axios';
const api_key = 'sk_test_oeAajvAikINvavk5';

const base64Credentials = Buffer.from(`${api_key}:`).toString('base64');

const api = axios.create({
  baseURL: 'https://api.pagar.me/core/v5',
  headers: {
    'Authorization': `Basic ${base64Credentials}`,
    'Content-Type': 'application/json'
  }
});
// fatal terminar de configurar o pagar.me
export default async (endpoint, data, method = 'post') => {
  try {
    const response = await api[method](endpoint, { ...data });

    return { error: false, data: response.data };
  } catch (err) {
    /*
    return {
        error: true,
        message: JSON.stringify(err.response.data.errors[0]),
      };
    */
    return { error: true, message: err.message }
  }
};
