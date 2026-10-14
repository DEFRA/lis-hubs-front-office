import { Button, createAll, Tabs } from 'govuk-frontend'
import { errorPageComponents } from '@defra/lis-infra-ui-services/components/error-pages'
import { layoutComponents } from '@defra/lis-infra-ui-services/components/layout'
import { ScrollableTable } from '@defra/lis-infra-ui-services/components/scrollable-table'

for (const component of new Set([
  ...layoutComponents,
  ...errorPageComponents,
  ScrollableTable,
  Button,
  Tabs
])) {
  createAll(component)
}
