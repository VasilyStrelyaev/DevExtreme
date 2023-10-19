import * as React from 'react';
import { useCallback, useLayoutEffect, useEffect, useState, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { DX_REMOVE_EVENT } from './component-base';
import { TemplateWrapperProps } from './types-new';
import * as events from 'devextreme/events';

const createHiddenNode = (containerNodeName: string, ref: React.LegacyRef<any>, defaultElement: string) => {
  const style = { display: 'none' };
  switch(containerNodeName) {
    case 'TABLE':
      return <tbody style={style} ref={ref}></tbody>;
    case 'TBODY':
      return <tr style={style} ref={ref}></tr>;
    default:
      return React.createElement(defaultElement, { style, ref });
  }
};

const TemplateWrapper = memo(function TemplateWrapper({ content, container, onRemoved, onRendered }: TemplateWrapperProps) {
  const [removalListenerRequired, setRemovalListenerRequired] = useState(false);

  const onTemplateRemoved = useCallback(() => {
    if (element.current) {
      events.off(element.current, DX_REMOVE_EVENT, onTemplateRemoved);
    }

    if (removalListenerElement.current) {
      events.off(removalListenerElement.current, DX_REMOVE_EVENT, onTemplateRemoved);
    }

    onRemoved();
  }, [onRemoved]);

  useLayoutEffect(() => {
    const el = element.current;

    if (el) {
      events.off(el, DX_REMOVE_EVENT, onTemplateRemoved);
      events.on(el, DX_REMOVE_EVENT, onTemplateRemoved);
    }

    if (!removalListenerRequired) {
      setRemovalListenerRequired(true);
    }
    else {
      events.off(removalListenerElement.current!, DX_REMOVE_EVENT, onTemplateRemoved);
      events.on(removalListenerElement.current!, DX_REMOVE_EVENT, onTemplateRemoved);
    }

    return () => {
      if (element.current) {
        container.appendChild(element.current);
      }

      if (hiddenNodeElement.current) {
        container.appendChild(hiddenNodeElement.current);
      }

      if (removalListenerElement.current) {
        container.appendChild(removalListenerElement.current);
      }

      if (el) {
        events.off(el, DX_REMOVE_EVENT, onTemplateRemoved);
      }
    };
  }, [onTemplateRemoved, removalListenerRequired, container]);

  useEffect(() => {
    onRendered();
  }, [onRendered]);

  const element = useRef<HTMLElement>();
  const hiddenNodeElement = useRef<HTMLElement>();
  const removalListenerElement = useRef<HTMLElement>();

  const hiddenNode = createHiddenNode(container?.nodeName, (node: HTMLElement) => {
    hiddenNodeElement.current = node as HTMLElement;
    element.current = node?.previousSibling as HTMLElement
  }, 'div');

  const removalListener = removalListenerRequired
    ? createHiddenNode(container?.nodeName, (node: HTMLElement) => { removalListenerElement.current = node }, 'span')
    : undefined;

  return createPortal(
      <>
        { content }
        { hiddenNode }
        { removalListener }
      </>,
      container
    );
});

export default TemplateWrapper;
