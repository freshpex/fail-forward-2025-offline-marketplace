import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#4a7c30',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
    },
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#dc2626',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
    },
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#2d5016',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
    },
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
