import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export function validAddress(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 500 && [...value.trim()].every((character) => { const code = character.codePointAt(0); return code >= 32 && code !== 127 || [9, 10, 13].includes(code); });
}
// One pending write per form. No automatic retry of a mutation.
export function addressSubmission(save = (address) => axios.put(`${API_BASE_URL}/api/v1/user/get-user-information`, { address })) {
  let pending = false;
  return async (value, receive) => {
    if (pending) return;
    if (!validAddress(value)) { receive({ pending: false, error: 'profile:address_invalid' }); return; }
    pending = true;
    receive({ pending: true, error: '', success: false });
    try {
      const response = await save(value.trim());
      receive({ pending: false, error: '', success: true, address: response.data.address });
    } catch (error) {
      receive({ pending: false, error: error.response?.data || 'common:network_error', success: false });
    } finally { pending = false; }
  };
}
