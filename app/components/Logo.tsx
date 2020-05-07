import React from 'react';

const SVG = `
`;

export default function Logo() {
  return <div className="logo" dangerouslySetInnerHTML={{ __html: SVG }} />;
}
