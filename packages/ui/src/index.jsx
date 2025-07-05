// UI Package Exports
export const Button = ({ children, ...props }) => (
  <button className="btn" {...props}>{children}</button>
);

export const Card = ({ children, ...props }) => (
  <div className="card" {...props}>{children}</div>
);
