import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Toast({ message, type }: ToastProps) {
  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span>{message}</span>
    </div>
  );
}
