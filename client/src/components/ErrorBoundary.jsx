import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='bg-gradient-to-b from-[#242124] to-[#000000] flex items-center justify-center h-screen w-screen text-white'>
          <div className='text-center p-8 max-w-md'>
            <h1 className='text-4xl font-bold mb-4'>Oops!</h1>
            <p className='text-lg mb-6'>Something went wrong. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className='px-6 py-2 bg-gradient-to-r from-[#A456F7] to-[#3D81F6] rounded-md hover:opacity-90 transition'
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
