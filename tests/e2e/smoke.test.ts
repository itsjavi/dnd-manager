import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { renderHarness } from './render-harness.js'

test('loads the static dist harness', async () => {
  const harness = renderHarness()

  await expect
    .element(page.getByRole('heading', { name: 'dnd-manager static harness' }))
    .toBeInTheDocument()
  await expect.element(page.getByTestId('status')).toHaveTextContent('Library loaded from dist.')

  harness.destroy()
})

test('clicking a cell updates status', async () => {
  const harness = renderHarness()
  const cellA = page.getByTestId('cell-a')

  await cellA.click()

  await expect.element(page.getByTestId('status')).toHaveTextContent('Clicked Alpha')
  harness.destroy()
})

test('pointer movement starts dragging and shows preview', async () => {
  const harness = renderHarness()

  harness.dragStartCellA()

  await expect.element(page.getByTestId('cell-a')).toHaveAttribute('data-dragging', 'true')
  await expect.element(page.getByTestId('drag-preview')).not.toHaveAttribute('hidden')
  await expect.element(page.getByTestId('status')).toHaveTextContent('Dragging Alpha')

  harness.destroy()
})

test('dragging A to B drops, swaps labels, and cleans up drag state', async () => {
  const harness = renderHarness()

  harness.dragCellAToCellBAndDrop()

  await expect.element(page.getByTestId('status')).toHaveTextContent('Ready')
  await expect.element(page.getByTestId('drag-preview')).toHaveAttribute('hidden', '')
  await expect.element(page.getByTestId('cell-a')).toHaveTextContent('Beta')
  await expect.element(page.getByTestId('cell-b')).toHaveTextContent('Alpha')
  await expect.element(page.getByTestId('cell-a')).not.toHaveAttribute('data-dragging')

  harness.destroy()
})

test('small move below drag threshold is treated as click and does not start drag', async () => {
  const harness = renderHarness()

  harness.smallMoveFromCellAThenRelease()

  await expect.element(page.getByTestId('status')).toHaveTextContent('Clicked Alpha')
  await expect.element(page.getByTestId('drag-preview')).toHaveAttribute('hidden', '')
  await expect.element(page.getByTestId('cell-a')).not.toHaveAttribute('data-dragging')

  harness.destroy()
})

test('pointer cancel clears active drag state', async () => {
  const harness = renderHarness()

  harness.cancelDragFromCellA()

  await expect.element(page.getByTestId('status')).toHaveTextContent('Ready')
  await expect.element(page.getByTestId('drag-preview')).toHaveAttribute('hidden', '')
  await expect.element(page.getByTestId('cell-a')).not.toHaveAttribute('data-dragging')

  harness.destroy()
})
