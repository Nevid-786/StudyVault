import { api } from "../hooks/axiosHook";

class AuthService {
	static async login(code) {
		const response = await api.post('/google/code', {
			code
		});

		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.message || 'Login failed');
        }
		return data;
	}
    static async currentUser(){
        const res= await api.get("/google/me");
        return res;
    }

	static async logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} finally {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('token');
			}
		}
	}
}

export default AuthService;
