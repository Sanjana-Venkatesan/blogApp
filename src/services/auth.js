import axios from 'axios'

const baseUrl = 'http://localhost:3003/api'

const login = async (credentials) => {
  const response = await axios.post(`${baseUrl}/login`, credentials)
  return response.data // returns { token, username, name }
}

const register = async (userInfo) => {
  const response = await axios.post(`${baseUrl}/users`, userInfo)
  return response.data // returns created user
}

export default { login, register }
