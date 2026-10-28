import React from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

function getSafeErrorMessage(error) {
  if (!error) return 'Terjadi kendala teknis tidak terduga.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || error.name || 'Error';
  if (typeof error === 'object') {
    try {
      if (typeof error.message === 'string') return error.message;
      return JSON.stringify(error);
    } catch {
      try {
        return Object.prototype.toString.call(error);
      } catch {
        return 'Objek galat tidak dapat dikonversi';
      }
    }
  }
  try {
    return String(error);
  } catch {
    return 'Galat sistem tidak teridentifikasi';
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = getSafeErrorMessage(this.state.error);
      const isSection = this.props.fallbackVariant === 'section';

      if (isSection) {
        return (
          <div className="w-full my-6 p-6 sm:p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Gagal Memuat Bagian Halaman
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
              Modul ini mengalami kendala saat memuat antarmuka. Anda dapat mencoba memuat ulang modul atau memuat ulang seluruh halaman.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors duration-100 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors duration-100 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Halaman</span>
              </button>
            </div>

            {this.state.error && (
              <details className="mt-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium text-slate-700 select-none hover:text-slate-900">
                  Detail Teknis Galat
                </summary>
                <div className="mt-2 overflow-x-auto font-mono text-[11px] text-rose-700 max-h-40 overflow-y-auto">
                  <p className="font-semibold">{errorMessage}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slate-600 whitespace-pre-wrap mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
              Terjadi Kendala Teknis
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Aplikasi mengalami galat tak terduga pada antarmuka. Sesi operasional Anda tetap aman. Silakan muat ulang halaman atau kembali ke beranda dinas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors duration-150 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition-colors duration-150 border border-slate-600"
              >
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400">
                <summary className="cursor-pointer font-medium text-slate-300 select-none hover:text-slate-200">
                  Detail Teknis (IT Support)
                </summary>
                <div className="mt-3 overflow-x-auto font-mono text-[11px] space-y-2 text-rose-300/90 max-h-48 overflow-y-auto">
                  <p className="font-semibold">{errorMessage}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
