import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell, Group, Text, Alert, Button } from '@mantine/core';
import { IconInfoCircle, IconBolt, IconBook } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DocsPage from './pages/DocsPage';

function App() {
  return (
    <Router>
      <AppShell
        header={{ height: 60 }}
        padding="md"
        styles={{
          root: { backgroundColor: '#1a1a1a' },
          main: { backgroundColor: '#1a1a1a' }
        }}
      >
        <AppShell.Header 
          styles={{
            header: { 
              backgroundColor: '#2a2a2a', 
              borderBottom: '1px solid #444',
              color: '#fff'
            }
          }}
        >
          <Group h="100%" px="md" justify="space-between">
            <Group gap="xs">
              <IconBolt size={28} color="#228be6" />
              <Text size="xl" fw={900} c="blue">
                FastFile
              </Text>
            </Group>
            
            <Group gap="md">
              <Button
                component={Link}
                to="/docs"
                variant="subtle"
                leftSection={<IconBook size={16} />}
                color="gray"
                styles={{
                  root: { color: '#ccc' }
                }}
              >
                Documentation
              </Button>
              
              <Alert
                variant="light"
                color="orange"
                icon={<IconInfoCircle size={16} />}
                styles={{
                  root: { 
                    border: 'none', 
                    backgroundColor: 'transparent',
                    padding: '4px 8px'
                  },
                  icon: { backgroundColor: 'transparent' },
                  message: { color: 'orange' }
                }}
              >
                <Text size="sm" fw={500}>
                  BETA VERSION
                </Text>
              </Alert>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </Router>
  );
}

export default App;
