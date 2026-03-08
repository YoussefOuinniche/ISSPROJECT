import { motion } from 'framer-motion';
import styled from 'styled-components';

const MotionCard = styled(motion.div)`
  border-radius: 16px;
  transition: box-shadow 220ms ease, border-color 220ms ease;
  will-change: transform;
`;

export default MotionCard;
