// Kitchen 404 Not Found Page
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@eatech/ui';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="text-6xl mb-4">🍳❓</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          404 - Seite nicht gefunden
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Die gesuchte Seite existiert nicht.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" size="large">
            Zurück zum Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
