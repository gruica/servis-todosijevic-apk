// Mobile utility functions stub (SMS functionality removed)

export const callPhoneNumber = async (phoneNumber: string): Promise<boolean> => {
  if (phoneNumber) {
    window.open(`tel:${phoneNumber}`, '_self');
    return true;
  }
  return false;
};

export const openMapWithAddress = async (address: string, city: string | null) => {
  const fullAddress = city ? `${address}, ${city}` : address;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
  window.open(mapsUrl, '_blank');
  return true;
};

export const isMobileEnvironment = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};