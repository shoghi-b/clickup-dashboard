'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export function ResetDataButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetType, setResetType] = useState<'clickup' | 'attendance' | null>(null);

  const handleReset = async (type: 'clickup' | 'attendance') => {
    if (!confirm(`Are you sure you want to delete ALL ${type === 'clickup' ? 'ClickUp' : 'Attendance'} data? This action cannot be undone!`)) {
      return;
    }

    setResetting(true);
    setResetType(type);

    try {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully deleted ${result.deletedCount} ${type === 'clickup' ? 'ClickUp' : 'Attendance'} records!`);
        // Reload the page to refresh data
        window.location.reload();
      } else {
        alert(`Failed to reset data: ${result.error}`);
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('Failed to reset data. Please try again.');
    } finally {
      setResetting(false);
      setResetType(null);
      setShowDialog(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        disabled={resetting}
      >
        <Trash2 className="w-4 h-4" />
        Reset Database
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reset Database</h3>
                  <p className="text-sm text-gray-500">Choose which data to delete</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleReset('clickup')}
                  disabled={resetting}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">ClickUp Data</div>
                      <div className="text-sm text-gray-500">Delete all time tracking entries</div>
                    </div>
                    {resetting && resetType === 'clickup' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleReset('attendance')}
                  disabled={resetting}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Attendance Data</div>
                      <div className="text-sm text-gray-500">Delete all attendance records</div>
                    </div>
                    {resetting && resetType === 'attendance' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDialog(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

