import React from 'react';
import { AlertTriangleIcon } from './Icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.setItem('afathar_current_page', 'home');
    } catch {}
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFE5D4] flex items-center justify-center p-4 antialiased">
          <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200/90 shadow-xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-[#6B1416]">
              <AlertTriangleIcon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-stone-900 font-serif">
                Halaman Mengalami Kendala
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Terjadi kesalahan teknis saat memuat tampilan halaman. Anda dapat memuat ulang halaman atau kembali ke beranda.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-left text-[11px] font-mono text-stone-600 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-[#6B1416] text-white hover:bg-[#520C0E] transition cursor-pointer shadow-sm"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
