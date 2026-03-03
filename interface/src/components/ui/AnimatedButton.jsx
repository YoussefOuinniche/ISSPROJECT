import React from 'react';
import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

const variants = {
  ghost: css`
    background: rgba(255, 255, 255, 0.03);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.12);
    &:hover { border-color: rgba(34, 211, 238, 0.45); color: #67e8f9; }
  `,
  gradient: css`
    background: linear-gradient(90deg, #06b6d4, #2563eb);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 26px rgba(6, 182, 212, 0.22);
    &:hover { filter: brightness(1.06); }
  `,
  danger: css`
    background: rgba(239, 68, 68, 0.12);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
    &:hover { background: rgba(239, 68, 68, 0.18); }
  `,
};

const sizes = {
  sm: css`height: 36px; padding: 0 12px; font-size: 0.8rem;`,
  md: css`height: 42px; padding: 0 16px; font-size: 0.9rem;`,
  lg: css`height: 48px; padding: 0 18px; font-size: 0.98rem;`,
};

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 180ms ease;
  backdrop-filter: blur(10px);
  white-space: nowrap;
  touch-action: manipulation;
  user-select: none;

  ${({ $variant }) => variants[$variant] || variants.ghost}
  ${({ $size }) => sizes[$size] || sizes.md}

  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (max-width: 640px) {
    min-height: 44px;
    padding-inline: 14px;
  }
`;

const AnimatedButton = ({
  children,
  variant = 'ghost',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  return (
    <StyledButton
      whileHover={disabled ? {} : { y: -1.5, scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.7 }}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled}
      className={className}
      type={type}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default AnimatedButton;
