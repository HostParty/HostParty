import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import routes from '../constants/routes.json';

const SVG = `
`;

export default function Logo() {
  return <div className="logo" dangerouslySetInnerHTML={{ __html: SVG }} />;
}
