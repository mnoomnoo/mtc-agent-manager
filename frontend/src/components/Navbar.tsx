import { Box, Flex, Heading } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      style={{
        fontWeight: pathname === to ? 'bold' : 'normal',
        color: pathname === to ? '#63b3ed' : 'inherit',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  )

  return (
    <Box bg="white" _dark={{ bg: 'gray.800' }} borderBottomWidth="1px" px={4} py={3}>
      <Flex maxW="1200px" mx="auto" align="center" gap={6}>
        <Heading size="sm" letterSpacing="tight" mr={4}>
          MTC Agent Manager
        </Heading>
        {navLink('/', 'Dashboard')}
        {navLink('/settings', 'Settings')}
      </Flex>
    </Box>
  )
}
