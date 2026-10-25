import { useCallback, useState } from "react";
import axios from "axios";

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
	withCredentials: true,
});

export const  useAxios=()=> {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const execute = useCallback(async (config) => {
		setLoading(true);
		setError(null);

		try {
			const response = await api.request(config);
			setData(response.data);
			return response.data;
		} catch (err) {
			setError(err.response?.data?.message || err.message || "Request failed");
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { data, loading, error, execute };
}
