import FailureState from '../../errors/FailureState.jsx';
import { useApiResource } from '../../errors/useApiResource.js';
import { API_BASE_URL } from '../../config/api.js';
import Loader from '../Loader/Loader';
import AddressForm from './AddressForm.jsx';

export default function Settings() {
  const { data, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/user/get-user-information`, false);
  if (error) return <FailureState kind={error} onRetry={retry} />;
  if (loading) return <Loader />;
  const profile = data.data || data;
  return <AddressForm initialAddress={profile.address || ''} />;
}
