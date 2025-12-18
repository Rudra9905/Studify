import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <Dialog.Title className="text-base font-semibold text-slate-900">
              {title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 space-y-4">{children}</div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
