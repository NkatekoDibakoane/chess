import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Controls from '../components/Controls';

const preset = { label: '5 + 5', initial: 5 * 60 * 1000, increment: 5000 };

describe('Controls', () => {
  it('renders and updates ELO slider', () => {
    const onEloChange = vi.fn();
    render(
      <Controls
        elo={1200}
        onEloChange={onEloChange}
        timeControl={preset}
        presets={[preset]}
        onTimeChange={() => {}}
        onNewGame={() => {}}
        playAs="w"
        onSideChange={() => {}}
        showHints
        onToggleHints={() => {}}
        engineReady
        gameOver={null}
      />
    );

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('1200');
    fireEvent.change(slider, { target: { value: '1500' } });
    expect(onEloChange).toHaveBeenCalledWith(1500);
  });
});
