declare module '*.svg' {
  const value: string;
  export default value;
}

import galyleoSvgstr from '../style/engageLively.svg';

export const galyleoIcon = new LabIcon({
  name: 'Galyleopkg:galyleo',
  svgstr: galyleoSvgstr
});
